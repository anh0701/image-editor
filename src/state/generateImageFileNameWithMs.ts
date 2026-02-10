export function generateImageFileNameWithMs(
  prefix = "image",
  ext: "png" | "jpg" | "jpeg" | "webp" = "png"
): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")

  return `${prefix}_` +
    `${d.getFullYear()}` +
    `${pad(d.getMonth() + 1)}` +
    `${pad(d.getDate())}_` +
    `${pad(d.getHours())}` +
    `${pad(d.getMinutes())}` +
    `${pad(d.getSeconds())}` +
    `${d.getMilliseconds()}.${ext}`
}
