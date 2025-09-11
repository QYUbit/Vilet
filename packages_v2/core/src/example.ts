import { initBindings } from "./bindings";
import { element, Selecter } from "./element";
import { effect, Ref, ref } from "./reactivity";
import { clone } from "./template";

initBindings()

/**
 * Counter
 */
const count = ref(0)

element({
    $selector: "#counter",
    textContent: count,
    onClick: () => count.value++
})

/**
 * Todo list
 */
interface Todo {
    id: string
    title: string
}

const todos: Ref<Todo[]> = ref([])
const currentTitle = ref("")

element({
    $selector: "#container",
    $for: todos,
    $key: (item: Todo) => item.id,
    $each: (item: Todo) => {
        const template = clone("#todo-template")
        if (!template) return

        element.bind(template.fragment)({
            $selector: "#card",
            onclick: () => {
                todos.value = todos.value.filter(todo => todo.id !== item.id)
            }
        })

        element.bind(template.fragment)({
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
        console.log("click")
        todos.value.push({
            id: crypto.randomUUID(),
            title: currentTitle.value,
        })
        currentTitle.value = ""
    }
})
