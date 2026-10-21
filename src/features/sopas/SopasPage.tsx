import { soups } from '../../seed/soups';
import { RecipeList } from './RecipeList';

export default function SopasPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Sopas</h1>
        <p className="text-muted">Las nueve sopas iChef, paso a paso y con gramos.</p>
      </header>
      <RecipeList recipes={soups.recipes} />
    </div>
  );
}
