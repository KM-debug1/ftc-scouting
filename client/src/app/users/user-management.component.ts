import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../auth/auth-service';
import { User, UserService, UserUpsertRequest } from './user.service';

type SystemRole = 'ADMIN' | 'VOLUNTEER' | 'GUARDIAN';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule
  ]
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  users: User[] = [];
  isLoading = true;
  editingUser: User | null = null;
  availableSystemRoles: SystemRole[] = ['ADMIN', 'VOLUNTEER', 'GUARDIAN'];
  jobRoles: string[] = ['volunteer_base'];

  userForm = this.formBuilder.group({
    systemRole: ['VOLUNTEER' as SystemRole, Validators.required],
    jobRole: ['volunteer_base']
  });

  ngOnInit(): void {
    this.loadData();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isVolunteerForm(): boolean {
    return this.userForm.controls.systemRole.value === 'VOLUNTEER';
  }

  loadData(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: users => {
        this.users = users;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Unable to load users.', 'Close', { duration: 3000 });
      }
    });

    this.userService.getJobRoles().subscribe({
      next: roles => {
        this.jobRoles = Object.keys(roles);
        if (!this.jobRoles.includes('volunteer_base')) {
          this.jobRoles.unshift('volunteer_base');
        }
      },
      error: () => {
        this.jobRoles = ['volunteer_base'];
      }
    });
  }

  startEdit(user: User): void {
    this.editingUser = user;
    this.userForm.setValue({
      systemRole: user.systemRole,
      jobRole: user.jobRole || 'volunteer_base'
    });
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.userForm.reset({
      systemRole: 'VOLUNTEER',
      jobRole: 'volunteer_base'
    });
  }

  submit(): void {
    if (!this.editingUser || this.userForm.invalid) {
      return;
    }

    const systemRole = this.userForm.controls.systemRole.value as SystemRole;
    const request: UserUpsertRequest = {
      username: this.editingUser.username,
      fullName: this.editingUser.fullName,
      email: this.editingUser.email,
      systemRole,
      jobRole: systemRole === 'VOLUNTEER' ? this.userForm.controls.jobRole.value : null
    };

    this.userService.updateUser(this.editingUser._id, request).subscribe({
      next: updated => {
        this.users = this.users.map(user => user._id === updated._id ? updated : user);
        this.snackBar.open('User updated.', 'Close', { duration: 2500 });
        this.cancelEdit();
      },
      error: () => this.snackBar.open('Unable to update user.', 'Close', { duration: 3000 })
    });
  }

  deleteUser(user: User): void {
    if (!this.canDeleteUser(user)) {
      return;
    }
    const confirmed = window.confirm(`Delete ${user.fullName}'s account?`);
    if (!confirmed) {
      return;
    }

    this.userService.deleteUser(user._id).subscribe({
      next: () => {
        this.users = this.users.filter(candidate => candidate._id !== user._id);
        this.snackBar.open('User deleted.', 'Close', { duration: 2500 });
      },
      error: () => this.snackBar.open('Unable to delete user.', 'Close', { duration: 3000 })
    });
  }

  canDeleteUser(user: User): boolean {
    return !this.isOnlyAdmin(user);
  }

  isOnlyAdmin(user: User): boolean {
    return user.systemRole === 'ADMIN'
      && this.users.filter(candidate => candidate.systemRole === 'ADMIN').length === 1;
  }

  formatSystemRole(role: string): string {
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  formatRoleName(role: string): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  trackByUserId(_index: number, user: User): string {
    return user._id;
  }
}
