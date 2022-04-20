import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { IUser } from './interfaces';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, AngularFirestoreDocument, } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';

export interface CreateUserDto { uid: string, username: string, email: string, password: string, photoURL: string, phoneNumber: number, city: string, emailVerified: boolean }

export interface UpdateUserDto { password: string, phoneNumber: number }

export interface LoginUserDto { email: string, password: string }

export interface ResetPasswordUserDto { email: string}

@Injectable({ providedIn: 'root' })
export class UserService {

  currentUser!: any;

  // Returns true when user is looged in and email is verified
  get isLoggedIn(): boolean {
    const user = getAuth().currentUser;
    return user !== null && user.emailVerified !== false ? true : false;
  }

  constructor(/*private storage: StorageService,*/ 
    private httpClient: HttpClient,
    public afs: AngularFirestore, // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    public router: Router,
    public ngZone: NgZone) {
      /* Saving user data in localstorage when 
    logged in and setting up null when logged out */
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.currentUser = user;
        localStorage.setItem('username', JSON.stringify(this.currentUser));
        JSON.parse(localStorage.getItem('username')!);
      } else {
        localStorage.setItem('username', 'null');
        JSON.parse(localStorage.getItem('username')!);
      }
    });
  }

  // Sign up with email/password
  SignUp(user: CreateUserDto) {
    return this.afAuth
      .createUserWithEmailAndPassword(user.email, user.password)
      .then((result) => {
        /* Call the SendVerificaitonMail() function when new user sign 
        up and returns promise */
        this.SendVerificationMail();
        user.uid = result.user!.uid;
        user.emailVerified = result.user!.emailVerified;
        this.SetUserData(user);        
      })
      .catch((error) => {
        window.alert(error.message);
      });
  }

  // Send email verfificaiton when new user sign up
  SendVerificationMail() {
    return this.afAuth.currentUser
      .then((u: any) => u.sendEmailVerification())
      .then(() => {
        this.router.navigate(['email-verification']);
      });
  }

  /* Setting up user data when sign in with username/password, 
  sign up with username/password and sign in with social auth  
  provider in Firestore database using AngularFirestore + AngularFirestoreDocument service */
  SetUserData(user: any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const userData: IUser = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      city: user.city,
      emailVerified: user.emailVerified,
    };
    return userRef.set(userData, {
      merge: true,
    });
  }

  // Log in with email/password
  LogIn(email: string, password: string) {
    return this.afAuth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        this.ngZone.run(() => {
          this.router.navigate(['profile']);
        });
      })
      .catch((error) => {
        window.alert(error.message);
      });
  }

  // Auth log in to run auth providers
  AuthLogin(provider: any) {
    return this.afAuth
      .signInWithPopup(provider)
      .then((result) => {
        this.ngZone.run(() => {
          this.router.navigate(['profile']);
        });
        this.SetUserData(result.user);
      })
      .catch((error) => {
        window.alert(error);
      });
  }

  // Reset Forggot password
  ForgotPassword(passwordResetEmail: string) {
    return this.afAuth
      .sendPasswordResetEmail(passwordResetEmail)
      .then(() => {
        window.alert('Емийлът е изпратен успешно. Моля проверете го, също така и папката спам.');
      })
      .catch((error) => {
        window.alert(error);
      });
  }

   // Log out
   LogOut() {
    return this.afAuth.signOut().then(() => {
      localStorage.removeItem('user');
      this.router.navigate(['login']);
    });
  }
}

