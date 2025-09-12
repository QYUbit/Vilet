import V from "../index"

/**
 * Counter
 */
function Counter() {
    const count = V.ref(0)

    V.element({
        $selector: "#counter",
        textContent: count,
        onClick: () => count.value++
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
    const todos: V.Ref<Todo[]> = V.ref([])
    const currentTitle = V.ref("")

    V.element({
        $selector: "#container",
        $for: todos,
        $key: (item: Todo) => item.id,
        $each: (item: Todo) => {
            const template = V.clone("#todo-template")
            if (!template) throw new Error("#todo-template not found")

            V.element.bind(template.fragment)({
                $selector: "#card",
                onclick: () => {
                    todos.value = todos.value.filter(todo => todo.id !== item.id)
                }
            })

            V.element.bind(template.fragment)({
                $selector: "#title",
                textContent: item.title
            })
            
            return template
        },
    })

    V.element({
        $selector: "#title-input",
        value: currentTitle,
        oninput: (e: any) => {
            currentTitle.value = e.target?.value
        }
    })

    V.element({
        $selector: "#add-button",
        onclick: () => {
            console.log("click")
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
