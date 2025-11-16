export type ReactiveValue<T> = T | (() => T) | { value: T } | Ref<T>

export interface Ref<T> {
    value: T
    __isRef: true
}

export type ClassValue = 
  | string 
  | Record<string, ReactiveValue<boolean>>
  | Array<string | Record<string, ReactiveValue<boolean>>>

export type StyleValue = 
  | string 
  | Record<string, ReactiveValue<string | number | null>>

export interface Selecter {
  querySelector<K extends keyof HTMLElementTagNameMap>(
    selectors: K
  ): HTMLElementTagNameMap[K] | null
  querySelector(selectors: string): HTMLElement | null
}

export interface ElementConfig {
  $?: string
  $selector?: string
  $select?: string
  $element?: Element | null
  $el?: Element | null
  $root?: Selecter
  
  id?: ReactiveValue<string>
  className?: ReactiveValue<string>
  textContent?: ReactiveValue<string | number>
  value?: ReactiveValue<any>
  
  onClick?: (event: MouseEvent, element: HTMLElement) => void
  onclick?: (event: MouseEvent, element: HTMLElement) => void
  onInput?: (event: InputEvent, element: HTMLElement) => void
  oninput?: (event: InputEvent, element: HTMLElement) => void
  onChange?: (event: Event, element: HTMLElement) => void
  onchange?: (event: Event, element: HTMLElement) => void
  onKeydown?: (event: KeyboardEvent, element: HTMLElement) => void
  onkeydown?: (event: KeyboardEvent, element: HTMLElement) => void
  onSubmit?: (event: SubmitEvent, element: HTMLElement) => void
  onsubmit?: (event: SubmitEvent, element: HTMLElement) => void
  
  $text?: ReactiveValue<string | number>
  $show?: ReactiveValue<boolean>
  $class?: ReactiveValue<ClassValue>
  $style?: ReactiveValue<StyleValue>
  $template?: () => (TemplateRef | ElementRef | undefined)[] | undefined
  $if?: ReactiveValue<boolean>
  $for?: ReactiveValue<any[]>
  $each?: (item: any, index: number) => (TemplateRef | ElementRef | undefined)[] | undefined
  $key?: (item: any, index: number) => string
  
  [key: string]: any
}

export interface TemplateRef {
  id: string
  mounted: boolean
  elements: ChildNode[]
  fragment: DocumentFragment
  mount(el: HTMLElement): void
  unmount(el: HTMLElement): void
}

export interface ElementRef {
  element: HTMLElement
  cleanup: Function[]
  destroy(): void
}
