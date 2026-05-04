/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './auth/auth-service';

@Component({
  template: '',
  standalone: true
})
class DummyComponent {}

describe('AppComponent', () => {
  const routes: Routes = [
    { path: '', component: DummyComponent, title: 'Home' },
    { path: 'users', component: DummyComponent, data: { roles: ['ADMIN'] } },
    { path: 'public', component: DummyComponent }
  ];

  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  function setAuthState({
    loggedIn = true,
    systemRole = 'VOLUNTEER'
  }: {
    loggedIn?: boolean;
    systemRole?: 'ADMIN' | 'VOLUNTEER' | 'GUARDIAN' | null;
  } = {}) {
    Object.defineProperty(authServiceSpy, 'loggedIn', {
      configurable: true,
      get: () => loggedIn
    });
    Object.defineProperty(authServiceSpy, 'systemRole', {
      configurable: true,
      get: () => systemRole
    });
  }

  beforeEach(waitForAsync(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'logout',
      'syncAccessProfile',
      'hasAllPermissions'
    ]);

    authServiceSpy.logout.and.returnValue(of(void 0));
    authServiceSpy.syncAccessProfile.and.returnValue(of('VOLUNTEER'));
    authServiceSpy.hasAllPermissions.and.returnValue(true);
    setAuthState();
    Object.defineProperty(authServiceSpy, 'displayName', {
      configurable: true,
      get: () => 'Volunteer'
    });

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the starter title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Starter App');
  });

  it('should sync access profile on init', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();

    expect(authServiceSpy.syncAccessProfile).toHaveBeenCalled();
  });

  it('should navigate to login after logout succeeds', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.logout();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should navigate to login after logout fails', () => {
    authServiceSpy.logout.and.returnValue(throwError(() => new Error('nope')));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.logout();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should sync access profile when the window regains focus', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    authServiceSpy.syncAccessProfile.calls.reset();
    app.onWindowFocus();

    expect(authServiceSpy.syncAccessProfile).toHaveBeenCalled();
  });

  it('should sync access profile when the document becomes visible', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    authServiceSpy.syncAccessProfile.calls.reset();

    app.onVisibilityChange();

    expect(authServiceSpy.syncAccessProfile).toHaveBeenCalled();
  });

  it('should allow public routes without auth metadata', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.canAccessPath('/public')).toBeTrue();
  });

  it('should hide protected routes when the role is not allowed', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    setAuthState({ loggedIn: true, systemRole: 'VOLUNTEER' });

    expect(app.canAccessPath('/users')).toBeFalse();
  });

  it('should redirect to login when route access evaluation requires authentication', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    spyOn<any>(app, 'deepestRoute').and.returnValue({ data: {} });
    spyOn<any>(app, 'evaluateAccess').and.returnValue('login');

    app['enforceRouteAccess']();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect home when route access evaluation denies access', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    spyOn<any>(app, 'deepestRoute').and.returnValue({ data: {} });
    spyOn<any>(app, 'evaluateAccess').and.returnValue('deny');

    app['enforceRouteAccess']();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should still enforce route access when profile sync fails', () => {
    authServiceSpy.syncAccessProfile.and.returnValue(throwError(() => new Error('sync failed')));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const enforceRouteAccessSpy = spyOn<any>(app, 'enforceRouteAccess');

    app['syncAccessProfileSilently']();

    expect(enforceRouteAccessSpy).toHaveBeenCalled();
  });
});
