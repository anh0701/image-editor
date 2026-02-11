export function medianDenoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const output = new Uint8ClampedArray(data)

  const getIndex = (x: number, y: number) => (y * width + x) * 4

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const rVals: number[] = []
      const gVals: number[] = []
      const bVals: number[] = []

      // Lấy vùng 3x3
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = getIndex(x + kx, y + ky)
          rVals.push(data[idx])
          gVals.push(data[idx + 1])
          bVals.push(data[idx + 2])
        }
      }

      // Sắp xếp
      rVals.sort((a, b) => a - b)
      gVals.sort((a, b) => a - b)
      bVals.sort((a, b) => a - b)

      const centerIdx = getIndex(x, y)

      // Lấy median (phần tử thứ 4 trong mảng 9 phần tử)
      output[centerIdx] = rVals[4]
      output[centerIdx + 1] = gVals[4]
      output[centerIdx + 2] = bVals[4]
      // giữ nguyên alpha
    }
  }

  imageData.data.set(output)
  ctx.putImageData(imageData, 0, 0)
}
