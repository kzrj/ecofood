import { useEffect, useState } from 'react'

/**
 * Загружает рецепты из API и возвращает словарь { code: { kuter, shpric, ... } }.
 * Пока грузится или при ошибке — возвращает пустой объект.
 */
export function useRecipeBook() {
  const [recipeBook, setRecipeBook] = useState({})

  useEffect(() => {
    fetch('/api/v1/recipes')
      .then((r) => r.ok ? r.json() : [])
      .then((rows) => {
        const book = {}
        for (const r of rows) book[r.code] = r
        setRecipeBook(book)
      })
      .catch(() => {})
  }, [])

  return recipeBook
}
