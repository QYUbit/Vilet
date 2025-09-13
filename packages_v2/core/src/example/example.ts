import { clone, element, ref, Ref } from "../index"
import { store } from "../../../store/src/index"

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

function TodoList() {
    const todos: Ref<Todo[]> = ref([])
    const currentTitle = ref("")

    store(todos, { key: "todolist_todos" })
    store(currentTitle, { key: "todo_title_input", storage: "sessionStorage" })

    element({
        $selector: "#container",
        $for: todos,
        $key: (item: Todo) => item.id,
        $each: (item: Todo) => {
            const template = clone("#todo-template")
            if (!template) throw new Error("#todo-template not found")

            element({
                $root: template.fragment,
                $selector: "#card",
                onclick: () => {
                    todos.value = todos.value.filter(todo => todo.id !== item.id)
                }
            })

            element({
                $root: template.fragment,
                $selector: "#title",
                textContent: item.title
            })
            
            return template
        },
    })

    element({
        $selector: "#title-input",
        value: currentTitle,
        oninput: (e: any) => {
            currentTitle.value = e.target?.value
        }
    })

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
