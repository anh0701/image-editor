// Sharpened = Original + amount * (Original - Blur)

export function unsharpMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount = 0.8
) {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // clone để làm blur
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext("2d")!

  tempCtx.putImageData(imageData, 0, 0)

  // blur nhẹ 
  tempCtx.filter = "blur(1px)"
  tempCtx.drawImage(tempCanvas, 0, 0)

  const blurred = tempCtx.getImageData(0, 0, width, height).data

  const output = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = data[i + c]! - blurred[i + c]!
      output[i + c] = data[i + c]! + amount * diff
    }
    output[i + 3] = data[i + 3]!
  }

  imageData.data.set(output)
  ctx.putImageData(imageData, 0, 0)
}
