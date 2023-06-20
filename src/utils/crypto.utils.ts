import crypto from 'crypto'

export function calculateHash (jsonArray: any[]): string {
  const jsonString = JSON.stringify(jsonArray)
  const hash = crypto.createHash('sha256')
  hash.update(jsonString)
  return hash.digest('hex')
}
