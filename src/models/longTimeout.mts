const maximumTimeout = 2 ** 31 - 1

export class LongTimeout {
  private callback: () => void
  private ms: number
  private timer?: NodeJS.Timer

  public constructor(callback: () => void, ms: number) {
    this.callback = callback
    this.ms = ms

    if (this.ms <= 0) {
      this.callback()
      return
    }

    this.setTimer()
  }

  private setTimer() {
    if (this.ms > maximumTimeout) {
      this.timer = setTimeout(() => {
        this.ms -= maximumTimeout
        this.setTimer()
      }, maximumTimeout)
      return
    }

    this.timer = setTimeout(this.callback, this.ms)
  }

  public clear() {
    if (!this.timer) {
      clearTimeout(this.timer)
    }

    this.callback = () => undefined
  }
}
