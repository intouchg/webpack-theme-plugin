import fs from 'fs'
import path from 'path'
import { configFilename, validateConfig, themeProcessor } from '@i/theme'
import type { Compiler } from 'webpack'
import type { Config } from '@i/theme'

class IntouchThemePlugin {
	configPath: string
	themeConfig: Required<Config>
	themeFilepaths: { [key: string]: string }
	outputPath: string
	themeFileBuffers: { [key: string]: Buffer }
	themeJSONData: { [key: string]: any }

	constructor () {
		const configPath = path.resolve('.', configFilename)

		if (!fs.existsSync(configPath)) {
			throw new Error(`No ${configFilename} config file was found at filepath: ${configPath}`)
		}

		this.configPath = configPath
		const config = validateConfig(require(this.configPath))

		if (!config) {
			throw new Error(`The ${configFilename} config file is invalid at filepath: ${this.configPath}`)
		}

		this.themeConfig = config
		this.themeFilepaths = {}
		this.themeFileBuffers = {}
		this.themeJSONData = {}

		this.validateThemeFilepath('themeValuesPath')
		this.validateThemeFilepath('themeComponentsPath')
		this.validateThemeFilepath('themeVariantsPath')

		this.outputPath = path.resolve('.', this.themeConfig.themeOutputPath)

		this.writeThemeJS = this.writeThemeJS.bind(this)
	}

	validateThemeFilepath (configPropertyName: keyof Config) {
		const filepath = path.resolve('.', this.themeConfig[configPropertyName])

		if (!fs.existsSync(filepath)) {
			throw new Error(`Could not locate file referenced by property "${configPropertyName}" in ${configFilename} config file.\n Property "${configPropertyName}" filepath: ${filepath}\n Config file filepath: ${this.configPath}`)
		}

		this.themeFilepaths[configPropertyName] = filepath
		this.themeFileBuffers[configPropertyName] = Buffer.from('')
		this.themeJSONData[configPropertyName] = {}
	}

	async writeThemeJS () {
		let didChange = false

		await Promise.all(Object.entries(this.themeFilepaths).map(async ([ key, filepath ]) => {
			const fileDataBuffer = fs.readFileSync(filepath)
			if (!fileDataBuffer.equals(this.themeFileBuffers[key])) {
				this.themeFileBuffers[key] = fileDataBuffer
				this.themeJSONData[key] = JSON.parse(fileDataBuffer.toString('utf-8'))
				didChange = true
			}
		}))

		if (didChange) {
			const theme = themeProcessor(this.themeJSONData as any)

			fs.writeFileSync(
				this.outputPath,
				`export default ${JSON.stringify(theme, null, '\t')}`,
			)
		}
	}

	watchThemeFiles () {
		let changeTimeoutId: ReturnType<typeof setTimeout> | null = null

		Object.values(this.themeFilepaths).forEach((filepath) => {
			fs.watch(filepath, 'utf-8', () => {
				if (changeTimeoutId) {
					clearTimeout(changeTimeoutId)
				}
				changeTimeoutId = setTimeout(this.writeThemeJS, 1)
			})
		})
	}

	// This function is called by Webpack one time when the plugin is initialized
	apply (_: Compiler) {
		this.writeThemeJS()
		this.watchThemeFiles()
	}
}

export = IntouchThemePlugin