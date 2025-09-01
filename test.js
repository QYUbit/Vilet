import V from "./vilet";

V.component({
    $ctx: { count: 0 },
    counter: {
        $: "#counter",
        onClick: (state) => state.count++,
        text: (state) => `Count: ${state.count}`
    }
})

V.component({
    $ctx: { showSecret: false },
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
    $ctx: { input: "" },
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
    return V.template({
        $: "template",
        $ctx: { content },
        li: {
            $: "li",
            text: (ctx) => ctx.content,
            onClick: (ctx) => onClick(ctx.content)
        }
    })
}

V.component({
    $ctx: { input: "", todos: [] },
    $root: "#list-example",
    input: {
        $: "input",
        value: (ctx) => ctx.input,
        onInput: (ctx, e) => ctx.input = e.target.value
    },
    add: {
        $: "button",
        onClick: (ctx) => {
            ctx.todos.push(ctx.input)
            ctx.input = ""
        }
    },
    todos: {
        $: "ul",
        $for: (ctx) => ctx.todos,
        $item: (item, _, ctx) => {
            return TodoItem(
                item,
                (todo) => {
                    ctx.todos = ctx.todos.filter(item => item !== todo)
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
