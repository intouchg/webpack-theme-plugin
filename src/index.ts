import fs from 'fs'
import path from 'path'
import { parseEnv } from '@i/utility'
import { IDSCONFIG_FILENAME, themeProcessor } from '@i/theme'
import type { Compiler } from 'webpack'

class IntouchThemePlugin {
	configPath: string | null
	themeConfig: { [key: string]: string } | null
	themeFilepaths: { [key: string]: string }
	outputPath: string | null
	themeFileBuffers: { [key: string]: Buffer }
	themeJSONData: { [key: string]: any }

	static THEME_VALUES_VALIDATION: { [key: string]: string } = {
		VALUES: 'Missing "VALUES" config option',
		GROUPS: 'Missing "GROUPS" config option',
		COMPONENTS: 'Missing "COMPONENTS" config option',
		VARIANTS: 'Missing "VARIANTS" config option',
		SNIPPETS: 'Missing "SNIPPETS" config option',
	}

	static THEME_CONFIG_VALIDATION: { [key: string]: string } = {
		THEME_OUTPUT: 'Missing "THEME_OUTPUT" config option',
	}

	static IDSCONFIG_VALIDATION: { [key: string]: string } = {
		...IntouchThemePlugin.THEME_VALUES_VALIDATION,
		...IntouchThemePlugin.THEME_CONFIG_VALIDATION,
	}

	constructor () {
		const configPath = path.resolve('.', IDSCONFIG_FILENAME)

		if (fs.existsSync(configPath)) {
			this.configPath = configPath
		}
		else {
			throw new Error(`No .idsconfig file was found at filepath: ${configPath}`)
		}

		const configData = fs.readFileSync(this.configPath).toString('utf-8')
		this.themeConfig = parseEnv(configData)

		// Validate .idsconfig file
		for (const key in IntouchThemePlugin.IDSCONFIG_VALIDATION) {
			if (!this.themeConfig.hasOwnProperty(key)) {
				throw new Error(`The .idsconfig file is not valid: ${IntouchThemePlugin.IDSCONFIG_VALIDATION[key]}`)
			}
		}

		this.themeFilepaths = {}
		this.themeFileBuffers = {}
		this.themeJSONData = {}

		// Validate existence of each theme values file referenced in .idsconfig and initialize themeData
		Object.keys(IntouchThemePlugin.THEME_VALUES_VALIDATION).forEach((key) => {
			const lowercaseKey = key.toLowerCase()
			const filepath = path.resolve('.', this.themeConfig![key])

			if (!fs.existsSync(filepath)) {
				throw new Error(`Could not locate theme ${key.toLowerCase()} JSON file at filepath specified in .idsconfig: ${filepath}`)
			}

			this.themeFilepaths[lowercaseKey] = filepath
			this.themeFileBuffers[lowercaseKey] = Buffer.from('')
			this.themeJSONData[lowercaseKey] = {}
		})

		this.outputPath = path.resolve('.', this.themeConfig['THEME_OUTPUT'])

		this.writeThemeJS = this.writeThemeJS.bind(this)
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
				this.outputPath!,
				`export default ${JSON.stringify(theme, null, '\t')}`,
			)
		}
	}

	watchThemeFiles () {
		let changeTimeoutId: ReturnType<typeof setTimeout> | null = null

		Object.entries(this.themeFilepaths).forEach(([ key, filepath ]) => {
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