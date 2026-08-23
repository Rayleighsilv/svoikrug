/**
 * Доменная ошибка приложения.
 * Несёт HTTP-статус и машинный код, которые глобальный errorHandler
 * возвращает клиенту вместо «глухого» 500 Internal Server Error.
 */
export class AppError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    // Восстанавливаем прототип — важно при использовании Error как базового
    // класса (class extends Error) после транспиляции в CommonJS.
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
