import * as fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FileUtils {
  static loadFile (
    path: string,
    format: 'json' | 'xml' = 'json'
  ): any {
    const file = fs.readFileSync(path, 'utf8')
    return format === 'json' ? JSON.parse(file) : file.trim()
  }

  static saveFile (
    path: string,
    data: string
  ): void {
    fs.writeFileSync(path, data)
  }
}
