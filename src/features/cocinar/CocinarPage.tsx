import { soups } from '../../seed/soups';
import { RecipeList } from './RecipeList';

export default function CocinarPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Cocinar</h1>
        <p className="text-muted">Sopas para la iChef, paso a paso y con gramos.</p>
      </header>
      <RecipeList recipes={soups.recipes} />
    </div>
  );
}
