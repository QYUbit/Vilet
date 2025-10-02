import { clone, effect, element, ref } from "../../packages/core/src"
import { store } from "../../packages/store/src"

/**
 * Counter
 */
function Counter() {
    const count = ref(0)

    store(count, { key: "counter_count" })

    element({
        $selector: "#counter-button",
        onClick: () => count.value++
    })

    element({
        $selector: "#counter-display",
        textContent: count
    })
}

/**
 * Todo list
 */
interface Todo {
    id: string
    title: string
}

// Encapsulate different functionallity in seperate functions
function TodoList() {
    // Create reactive values
    const todos = ref<Todo[]>([])
    const currentTitle = ref("")

    // Runs when reactive value todos changes
    effect(() => console.log(`Todo change: ${JSON.stringify(todos.value)}`))

    // Load saved values from storage with the store plugin and observe changes
    store(todos, { key: "todolist_todos" })
    store(currentTitle, { key: "todo_title_input", storage: "sessionStorage" })

    // Declare behavior for the HTML element with id "container"
    element({
        $selector: "#container",
        // Observe todos
        $for: todos,
        // Use item.id as key
        $key: (item: Todo) => item.id,
        // Execute this callback for each todo
        $each: (item: Todo) => {
            // Clone the HTML template element with id "todo-template" 
            const template = clone("#todo-template")
            if (!template) return [];

            // Declare behavior for the children of our template element with the id "card"
            const el1 = element({
                $root: template.fragment,
                $selector: "#card",
                // Listen to clicks on this element
                onclick: () => {
                    // Remove the current todo from todos
                    todos.value = todos.value.filter(todo => todo.id !== item.id)
                }
            })

            const el2 = element({
                $root: template.fragment,
                $selector: "#title",
                // Bind text content to item.title
                textContent: item.title
            })
            
            // Return elementRefs for cleanup and template
            return [template, el1, el2]
        },
    })

    // Reactive input element
    element({
        $selector: "#title-input",
        value: currentTitle,
        oninput: (e: any) => {
            currentTitle.value = e.target?.value
        }
    })

    // Create new todo on click at #add-button
    element({
        $selector: "#add-button",
        onclick: () => {
            todos.value.push({
                id: crypto.randomUUID(),
                title: currentTitle.value,
            })
            currentTitle.value = ""
        }
    })
}

Counter()
TodoList()
