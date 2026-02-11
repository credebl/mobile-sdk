import { defineConfig } from 'tsdown'
import config from '../../tsdown.config.base'

export default defineConfig(
  config.map((entry) => ({
    ...entry,
    external: ['@types/react', 'csstype'],
  }))
)
