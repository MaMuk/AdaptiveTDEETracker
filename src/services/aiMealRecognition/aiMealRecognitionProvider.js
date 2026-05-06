export class AiMealRecognitionProvider {
  constructor(providerName) {
    this.providerName = providerName || 'unknown'
  }

  async recognizeMealFromImage() {
    throw new Error('recognizeMealFromImage() is not implemented')
  }
}
