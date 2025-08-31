import V from "./vilet";

V.component({
    $state: { count: 0 },
    counter: {
        $: "#counter",
        onClick: (state) => state.count++,
        text: (state) => `Count: ${state.count}`
    }
})

V.component({
    $state: { showSecret: false },
    toggle: {
        $: "#toggle",
        onClick: (state) => state.showSecret = !state.showSecret
    },
    secret: {
        $: "#secret",
        show: (state) => state.showSecret
    }
})

V.component({
    $state: { input: "" },
    input: {
        $: "#input",
        value: (state) => state.input,
        onInput: (state, e) => state.input = e.target.value
    },
    output: {
        $: "#output",
        text: (state) => `Your input: ${state.input}`
    },
    reset: {
        $: "#reset",
        onClick: (state) => state.input = ""
    }
})

function TodoItem(content, onClick) {
    return () => {
        return V.template({
            $: "template",
            $state: { content },
            li: {
                $: "li",
                text: (state) => state.content,
                onClick: (state) => onClick(state.content)
            }
        })
    }
}

V.component({
    $state: { input: "", todos: [] },
    $root: "#list-example",
    input: {
        $: "input",
        value: (state) => state.input,
        onInput: (state, e) => state.input = e.target.value
    },
    add: {
        $: "button",
        onClick: (state) => {
            state.todos.push(state.input)
            state.input = ""
        }
    },
    todos: {
        $: "ul",
        $for: (state) => state.todos,
        $item: (item, _, state) => {
            return TodoItem(
                item,
                (todo) => {
                    state.todos = state.todos.filter(item => item !== todo)
                }
            )
        },
    }
})

// React equivalent of last example
/*
function React() {
    const [input, setInput] = useState("")
    const [todos, setTodos] = useState([])

    const handleAdd = () => {
        setTodos(prev => [...prev, input])
        setInput("")
    }

    const handleRemove = (todo) => {
        setTodos(prev => prev.filter(item => item !== todo))
    }

    return (
        <div>
            <input value={input} onChange={(e) => setInput(e.target.value)}></input>
            <button onClick={handleAdd}>Add</button>
            <ul>
                {
                    todos.map((todo) => (
                        <li onClick={handleRemove}>{todo}</li>
                    ))
                }
            </ul>
        </div>
    )
}
*/
