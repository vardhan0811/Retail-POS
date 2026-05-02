import { ApplicationConfig, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth-interceptor';
import { GlobalErrorHandlerService } from './core/global-error-handler.service';
import { AuthService } from './core/auth.service';

import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.initialize(),
      deps: [AuthService],
      multi: true
    }
  ]
};
