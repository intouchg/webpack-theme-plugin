import fs from 'fs'
import chokidar from 'chokidar'
import path from 'path'
import { configFilename, validateConfig, themeProcessor } from '@intouchg/theme'
import { createUuid } from './createUuid'
import type { Compiler } from 'webpack'
import type { Config } from '@intouchg/theme'

const TYPE_DECLARATIONS = `
type StyleTheme = typeof theme

declare module 'styled-components' {
	export interface DefaultTheme extends StyleTheme {}
}

`

class IntouchThemePlugin {
	configPath: string
	themeConfig: Required<Config>
	themeFilepaths: { [key: string]: string }
	outputPath: string
	isTypescript: boolean
	themeFileBuffers: { [key: string]: Buffer }
	themeJSONData: { [key: string]: any }

	constructor (configFilepath?: string) {
		const configPath = configFilepath || path.resolve('.', configFilename)

		if (!fs.existsSync(configPath)) {
			throw new Error(`No ${configFilename} config file was found at filepath: ${configPath}`)
		}

		this.configPath = configPath
		const configData = fs.readFileSync(this.configPath).toString('utf-8')
		const config = validateConfig(JSON.parse(configData))

		if (!config) {
			throw new Error(`The ${configFilename} config file is invalid at filepath: ${this.configPath}`)
		}

		this.themeConfig = config
		this.themeFilepaths = {}
		this.themeFileBuffers = {}
		this.themeJSONData = {}

		this.validateThemeFilepath('values')
		this.validateThemeFilepath('variants')

		this.outputPath = path.resolve('.', this.themeConfig.output)
		this.isTypescript = path.extname(this.outputPath) === '.ts'

		this.writeThemeJS = this.writeThemeJS.bind(this)
	}

	validateThemeFilepath (configPropertyName: keyof Config) {
		const filepath = path.resolve('.', this.themeConfig[configPropertyName])

		if (!fs.existsSync(filepath)) {
			throw new Error(`Could not locate file referenced by property "${configPropertyName}" in ${configFilename} config file.\n Referenced "${configPropertyName}" filepath: ${filepath}\n Config file filepath: ${this.configPath}`)
		}

		this.themeFilepaths[configPropertyName] = filepath
		this.themeFileBuffers[configPropertyName] = Buffer.from('')
		this.themeJSONData[configPropertyName] = {}
	}

	async writeThemeJS () {
		let didChange = false

		await Promise.all(Object.entries(this.themeFilepaths).map(([ key, filepath ]) => new Promise((resolve) => {
			const fileDataBuffer = fs.readFileSync(filepath)

			if (!fileDataBuffer.equals(this.themeFileBuffers[key])) {
				this.themeFileBuffers[key] = fileDataBuffer
				const jsonData = JSON.parse(fileDataBuffer.toString('utf-8'))
				this.themeJSONData[key] = jsonData
				didChange = true

				const length = jsonData.length
				let createdUuid = false
				
				for (let i = 0; i < length; i++) {
					if (!jsonData[i].hasOwnProperty('id') || !jsonData[i].id) {
						jsonData[i].id = createUuid()
						createdUuid = true
					}
				}

				if (createdUuid) {
					fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2))
				}

				resolve(true)
			}
			else {
				resolve(true)
			}
		})))

		if (didChange) {
			const theme = themeProcessor(this.themeJSONData as any)

			fs.writeFileSync(
				this.outputPath,
				`const theme = ${JSON.stringify(theme, null, 2)}${this.isTypescript ? ' as const' : ''}\n\n${this.isTypescript ? TYPE_DECLARATIONS : ''}export default theme`,
			)
		}
	}

	watchThemeFiles () {
		Object.values(this.themeFilepaths).forEach((filepath) => {
			const watcher = chokidar.watch(filepath, { persistent: true })
			watcher.on('change', this.writeThemeJS)
		})
	}

	// This function is called by Webpack one time when the plugin is initialized
	apply (_: Compiler) {
		this.writeThemeJS()
		this.watchThemeFiles()
	}
}

export = IntouchThemePlugin