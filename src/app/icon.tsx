import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#18181b', // zinc-900
          borderRadius: '128px',
        }}
      >
        <div
          style={{
            fontSize: 360,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            color: '#10b981', // emerald-500
          }}
        >
          W
        </div>
      </div>
    ),
    { ...size }
  )
}
