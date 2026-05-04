import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';

describe('AppRoutingModule', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppRoutingModule]
    });

    router = TestBed.inject(Router);
  });

  it('registers the starter routes', () => {
    const routeSummary = router.config.map(route => ({
      path: route.path,
      title: route.title
    }));

    expect(routeSummary).toContain({ path: '', title: 'Home' });
    expect(routeSummary).toContain({ path: 'login', title: 'Login' });
    expect(routeSummary).toContain({ path: 'sign-up', title: 'Sign Up' });
    expect(routeSummary).toContain({ path: 'users', title: 'Users' });
  });

  it('protects user management with the admin role', () => {
    const usersRoute = router.config.find(route => route.path === 'users');

    expect(usersRoute?.data?.['roles']).toEqual(['ADMIN']);
  });
});
