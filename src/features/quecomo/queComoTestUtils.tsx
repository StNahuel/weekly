import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { DbProvider } from '../../app/DbProvider';
import { routes } from '../../app/router';

export function renderQueComo() {
  render(
    <DbProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/que-como'] })} />
    </DbProvider>,
  );
}
