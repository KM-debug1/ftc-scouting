import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink, RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { AuthService } from "../auth-service";

@Component({
  selector: 'app-signup',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class SignUpComponent {
  signupForm = new FormGroup({
    fullName: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });
  isLoading = false;
  error: string | null = null;
  hidePassword = true;

  authService = inject(AuthService);
  router = inject(Router);

  onSubmit() {
    if (!this.signupForm.valid) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    const { fullName, username, password, email } = this.signupForm.value;
    this.authService.signup(username!, password!, fullName!, 'VOLUNTEER', email || undefined).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }
}
