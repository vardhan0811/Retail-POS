import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { PosHeaderComponent } from './pos-header.component';
import { filter, map, mergeMap, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-pos-layout',
  template: `
    <div class="min-h-screen bg-background flex flex-col">
      @if (!hideHeader()) {
        <app-pos-header class="animate-in fade-in slide-in-from-top duration-500"></app-pos-header>
      }
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  standalone: true,
  imports: [RouterOutlet, PosHeaderComponent]
})
export class PosLayoutComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly hideHeader = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null), // Handle initial load correctly
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      mergeMap(route => route.data),
      map(data => data['hideHeader'] === true)
    ),
    { initialValue: false }
  );
}
