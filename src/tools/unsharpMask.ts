// Sharpened = Original + amount * (Original - Blur)

export function unsharpMask(
  src: ImageData,
  width: number,
  height: number,
  amount = 0.8
): ImageData {

  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext("2d")!

  tempCtx.putImageData(src, 0, 0)

  // blur nhẹ 
  tempCtx.filter = "blur(1px)"
  tempCtx.drawImage(tempCanvas, 0, 0)

  const blurred = tempCtx.getImageData(0, 0, width, height).data

  const data = src.data

  const output = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = data[i + c]! - blurred[i + c]!
      output[i + c] = data[i + c]! + amount * diff
    }
    output[i + 3] = data[i + 3]!
  }

  console.log(output)
  return new ImageData(output, width, height)
}
