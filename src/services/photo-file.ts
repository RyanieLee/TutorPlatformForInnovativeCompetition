import { BusinessError } from './errors'

/** Mock-only local portrait persistence. API mode uploads binary to the server. */
export async function readDemoPhoto(filePath: string): Promise<string> {
  const maxBytes = 600_000 // Keep one uni storage record below common mini-program limits.
  if (typeof FileReader !== 'undefined') {
    const response = await fetch(filePath)
    const blob = await response.blob()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size > maxBytes)
      throw new BusinessError('INVALID', '演示照片仅支持 JPG、PNG、WebP，且需小于 600 KB')
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new BusinessError('STORAGE', '读取本机照片失败'))
      reader.readAsDataURL(blob)
    })
  }
  const ext = filePath.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1]?.toLowerCase()
  if (!ext) throw new BusinessError('INVALID', '演示照片仅支持 JPG、PNG、WebP')
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const fs = (uni as unknown as {getFileSystemManager: () => {readFile:(options:{filePath:string;encoding:string;success:(result:{data:string})=>void;fail:()=>void})=>void}}).getFileSystemManager()
  const base64 = await new Promise<string>((resolve, reject) => fs.readFile({filePath,encoding:'base64',success:result=>resolve(result.data),fail:()=>reject(new BusinessError('STORAGE','读取本机照片失败'))}))
  if (base64.length * 0.75 > maxBytes) throw new BusinessError('INVALID', '演示照片需小于 600 KB')
  return `data:${mime};base64,${base64}`
}
