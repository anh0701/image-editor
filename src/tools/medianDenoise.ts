export function medianDenoise(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    const output = new Uint8ClampedArray(data)

    const getIndex = (x: number, y: number) => (y * width + x) * 4

    // (x-1,y-1)  (x,y-1)  (x+1,y-1)
    // (x-1,y)    (x,y)    (x+1,y)
    // (x-1,y+1)  (x,y+1)  (x+1,y+1)


    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const rVals: number[] = []
            const gVals: number[] = []
            const bVals: number[] = []

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = getIndex(x + kx, y + ky)
                    rVals.push(data[idx]!)
                    gVals.push(data[idx + 1]!)
                    bVals.push(data[idx + 2]!)
                }
            }

            // median R/G/B  

            const centerIdx = getIndex(x, y)

            output[centerIdx] = median9(rVals)
            output[centerIdx + 1] = median9(gVals)
            output[centerIdx + 2] = median9(bVals)
        }
    }

    imageData.data.set(output)
    ctx.putImageData(imageData, 0, 0)
    console.log(imageData)
}

// The median of the sequence of 9 numbers = the 5th largest number. 
function median9(values: number[]): number {
    const v = values.slice()

    for (let i = 0; i < 5; i++) {
        let minIndex = i

        for (let j = i + 1; j < 9; j++) {
            if (v[j]! < v[minIndex]!) {
                minIndex = j
            }
        }

        const temp = v[i]
        v[i] = v[minIndex]!
        v[minIndex] = temp!
    }

    return v[4]!
}
