<!-- 
Mode:
( ) Photo : denoise = 0.5 sharpen = 0.3

( ) Text/UI : denoise = 0.2 sharpen = 0.6

( ) Custom

| Denoise:   [------●-----]  (0 → 100)             |
| Sharpen:   [---●--------]  (0 → 100)             |
| Reset Adjustments                                |
 
-->

# Image Editor

![demo](public/demo.png)  

## Key Features

- **Rich Annotations**: Supports interactive drawing tools including **Rectangles**, **Pens**, **Arrows**, and **Text** for image markup.
- **Client-Side Processing:** Implements Sharpening and Denoising algorithms directly in the browser without server-side overhead.
- **Real-time Preview:** Immediate visual feedback when adjusting image parameters.
- **Clipboard Integration**: Supports seamless workflow with **Copy**, **Paste**, and **Save** functionality (allowing users to paste images directly from their clipboard).
- **High Performance:** Leverages HTML5 Canvas API for efficient pixel-level manipulation.
- **Type-Safe Development:** Built with TypeScript to ensure code maintainability and robustness.

## Tech Stack

- **Framework:** Vue.js 
- **Language:** TypeScript
- **Core:** HTML5 Canvas, CSS3
- **API**: Navigator Clipboard API (for copy/paste logic)