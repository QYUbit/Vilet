export type ReactiveValue<T> = T | (() => T) | { value: T }

export interface ShowConfig {
  value: ReactiveValue<boolean>
  hideDelay?: number
}

export type ClassValue = 
  | string 
  | Record<string, ReactiveValue<boolean>>
  | Array<string | Record<string, ReactiveValue<boolean>>>

export type StyleValue = 
  | string 
  | Record<string, ReactiveValue<string | number | null>>

export interface ForConfig<T = any> {
  $each: (item: T, index: number) => TemplateRef
  $key?: (item: T, index: number) => string
}

export interface ElementConfig {
  $?: string
  $selector?: string
  $select?: string
  $element?: HTMLElement
  $el?: HTMLElement
  
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
  $show?: ReactiveValue<boolean> | ShowConfig
  $class?: ReactiveValue<ClassValue>
  $style?: ReactiveValue<StyleValue>
  $for?: ReactiveValue<any[]>
  $each?: (item: any, index: number) => TemplateRef
  $key?: (item: any, index: number) => string
  
  [key: string]: any
}

export interface TemplateRef {
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
