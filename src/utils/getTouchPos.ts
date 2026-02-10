export function getTouchPos(e: TouchEvent, canvasRef: any) {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()

  const t =
    e.touches.length > 0
      ? e.touches[0]
      : e.changedTouches[0]

  if (!t) return null

  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (t.clientX - rect.left) * scaleX,
    y: (t.clientY - rect.top) * scaleY
  }
}