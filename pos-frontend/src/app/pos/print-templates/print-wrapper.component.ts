import { Component, ViewChild, ViewContainerRef, ComponentFactoryResolver, Type } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-print-wrapper',
  standalone: true,
  imports: [CommonModule],
  template: `<div #container></div>`
})
export class PrintWrapperComponent {
  @ViewChild('container', { read: ViewContainerRef, static: true }) container!: ViewContainerRef;

  constructor(private resolver: ComponentFactoryResolver) {}

  loadComponent<T>(componentType: Type<T>, data: any): T {
    this.container.clear();
    const factory = this.resolver.resolveComponentFactory(componentType);
    const componentRef = this.container.createComponent(factory);
    (componentRef.instance as any).data = data;
    return componentRef.instance;
  }
}
