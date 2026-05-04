import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { RoleGuard } from './auth/role.guard';

const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent), title: 'Home' },
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent), title: 'Login' },
  { path: 'sign-up', loadComponent: () => import('./auth/sign-up/sign-up.component').then(m => m.SignUpComponent), title: 'Sign Up' },
  {
    path: 'users',
    loadComponent: () => import('./users/users.component').then(m => m.UsersComponent),
    title: 'Users',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] }
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule { }
