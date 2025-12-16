import { Routes } from '@angular/router';
import { HostComponent } from './host/host.component';
import { BoardComponent } from './board/board.component';
import { canDeactivateGuard } from './shared/guards/can-deactivate.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/host',
    pathMatch: 'full'
  },
  {
    path: 'host',
    component: HostComponent,
    canDeactivate: [canDeactivateGuard]
  },
  {
    path: 'board',
    component: BoardComponent
  },
  {
    path: '**',
    redirectTo: '/host'
  }
];
