import { forwardRef, useImperativeHandle, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'

import { CAPTCHA_SITE_KEY } from '../lib/captcha'

export interface CaptchaHandle {
  /** Clears the widget so the person can solve a fresh challenge (tokens are single-use). */
  reset: () => void
}

interface Props {
  onToken: (token: string) => void
  siteKey?: string
}

/** The hCaptcha checkbox, or nothing when no site key is configured. */
const Captcha = forwardRef<CaptchaHandle, Props>(function Captcha({ onToken, siteKey = CAPTCHA_SITE_KEY }, ref) {
  const widget = useRef<HCaptcha>(null)
  useImperativeHandle(ref, () => ({
    reset: () => {
      widget.current?.resetCaptcha()
      onToken('')
    },
  }))
  if (!siteKey) return null
  return (
    <div className="captcha">
      <HCaptcha
        ref={widget}
        sitekey={siteKey}
        onVerify={(token) => onToken(token)}
        onExpire={() => onToken('')}
        onError={() => onToken('')}
      />
    </div>
  )
})

export default Captcha
