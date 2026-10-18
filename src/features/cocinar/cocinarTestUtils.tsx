import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { DbProvider } from '../../app/DbProvider';
import { routes } from '../../app/router';

export function renderRoute(path: string) {
  render(
    <DbProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </DbProvider>,
  );
}

function byLine(text: string) {
  return (_content: string, element: Element | null) => element?.tagName === 'LI' && element.textContent === text;
}

export function getLine(text: string, container: { getByText: typeof screen.getByText } = screen) {
  return container.getByText(byLine(text));
}
