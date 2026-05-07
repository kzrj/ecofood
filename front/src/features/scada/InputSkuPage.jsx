import InputSkuPanel from './components/InputSkuPanel'
import { useRecipeBook } from './hooks/useRecipeBook'

export default function InputSkuPage() {
  const recipeBook = useRecipeBook()

  return (
    <div className="p-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Список SKU на вход</h2>
      <div className="w-full max-w-4xl">
        <InputSkuPanel recipeBook={recipeBook} />
      </div>
    </div>
  )
}
