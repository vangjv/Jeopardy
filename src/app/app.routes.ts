import { Routes } from '@angular/router';
import { canDeactivateGuard } from './shared/guards/can-deactivate.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/host',
    pathMatch: 'full'
  },
  {
    path: 'host',
    loadComponent: () => import('./host/host.component').then(module => module.HostComponent),
    canDeactivate: [canDeactivateGuard]
  },
  {
    path: 'board',
    loadComponent: () => import('./board/board.component').then(module => module.BoardComponent)
  },
  {
    path: '**',
    redirectTo: '/host'
  }
];
