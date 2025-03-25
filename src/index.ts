import type { Plugin } from 'vite'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import micromatch from 'micromatch'

export interface RestartConfig {
  file: string
  checkContent?: boolean
}

export interface VitePluginSmartRestartOptions {
  /**
   * Enable glob support for watcher (it's disabled by Vite, but add this plugin will turn it on by default)
   *
   * @default true
   */
  glob?: boolean
  /**
   * @default 500
   */
  delay?: number
  /**
   * Array of files to watch, changes to those file will trigger a server restart
   * Can be string, string array, RestartConfig or RestartConfig array
   */
  restart?: string | RestartConfig | (string | RestartConfig)[]
  /**
   * Array of files to watch, changes to those file will trigger a client full page reload
   */
  reload?: string | string[]
}

let i = 0

function toArray<T>(arr: T | T[] | undefined): T[] {
  if (!arr)
    return []
  if (Array.isArray(arr))
    return arr
  return [arr]
}

async function isFile(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (err) {
    return false // 路径不存在或无法访问
  }
}

function VitePluginSmartRestart(options: VitePluginSmartRestartOptions = {}): Plugin {
  const {
    delay = 500,
    glob: enableGlob = true,
  } = options

  let root = process.cwd()
  let reloadGlobs: string[] = []
  const restartGlobs: string[] = []
  const restartConfigMap = new Map<string, { checkContent: boolean, content?: string }>()

  let timerState = 'reload'
  let timer: ReturnType<typeof setTimeout> | undefined

  function clear() {
    clearTimeout(timer)
  }
  function schedule(fn: () => void) {
    clear()
    timer = setTimeout(fn, delay)
  }

  return {
    name: `vite-plugin-smart-estart:${i++}`,
    apply: 'serve',
    config(c) {
      if (!enableGlob)
        return
      if (!c.server)
        c.server = {}
      if (!c.server.watch)
        c.server.watch = {}
      c.server.watch.disableGlobbing = false
    },
    async configResolved(config) {
      root = config.root

      const processRestartConfig = async (item: string | RestartConfig) => {
        const config: RestartConfig = typeof item === 'string'
          ? { file: item, checkContent: false }
          : { ...item, checkContent: item.checkContent ?? false }

        const absolutePath = path.normalize(path.posix.join(root, config.file))
        restartGlobs.push(absolutePath)

        const checkContent = config.checkContent ?? false
        let fileContent
        const isFileTmp = await isFile(absolutePath)
        if (checkContent && isFileTmp) {
          fileContent = await fs.readFile(absolutePath, 'utf-8')
          restartConfigMap.set(absolutePath, {
            checkContent,
            content: fileContent,
          })
        }
      }

      if (options.restart) {
        const restartConfigs = toArray(options.restart)
        for (let i = 0; i < restartConfigs.length; i++) {
          await processRestartConfig(restartConfigs[i])
        }
      }

      reloadGlobs = toArray(options.reload).map(i => path.posix.join(root, i))
    },
    configureServer(server) {
      server.watcher.add([
        ...restartGlobs,
        ...reloadGlobs,
      ])

      server.watcher.on('add', handleFileAdd)
      server.watcher.on('change', handleFileChange)
      server.watcher.on('unlink', handleFileUnlink)

      function handleFileAdd(file: string) {
        return handleFileChangeResolve(file, 'add')
      }

      function handleFileChange(file: string) {
        return handleFileChangeResolve(file, 'change')
      }

      function handleFileUnlink(file: string) {
        return handleFileChangeResolve(file, 'unlink')
      }

      async function handleFileChangeResolve(file: string, type: string) {
        file = path.normalize(file)

        if (micromatch.isMatch(file, restartGlobs)) {
          if (type === 'change') {
            const config = restartConfigMap.get(file)
            if (config?.checkContent) {
              try {
                const newContent = await fs.readFile(file, 'utf-8')
                if (config.content === newContent) {
                  return // 内容没有变化，不触发重启
                }
                config.content = newContent
              }
              catch (error) {
                console.error(`Failed to read file content: ${file}`, error)
              }
            }
          }

          timerState = 'restart'
          schedule(() => {
            server.restart()
          })
        }
        else if (micromatch.isMatch(file, reloadGlobs) && timerState !== 'restart') {
          timerState = 'reload'
          schedule(() => {
            server.ws.send({ type: 'full-reload' })
            timerState = ''
          })
        }
      }
    },
  }
}

export default VitePluginSmartRestart
