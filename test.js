import V from "./index";

V.component({
    $ctx: { count: 0 },
    "#counter": {
        onClick: (ctx) => ctx.count++,
        $text: (ctx) => `Count: ${ctx.count}`
    }
})

V.component({
    $ctx: { showSecret: false },
    "#toggle": {
        onClick: (ctx) => ctx.showSecret = !ctx.showSecret
    },
    "#secret": {
        $show: (ctx) => ctx.showSecret
    }
})

V.component({
    $ctx: { input: "" },
    "#input": {
        $model: "input"
    },
    "#output": {
        $text: (ctx) => `Your input: ${ctx.input}`
    },
    "#reset": {
        onClick: (ctx) => ctx.input = ""
    }
})

V.component({
    $ctx: { username: "" },
    $root: "#validation-example",
    "#input": {
        $model: {
            path: "username",
            validate: (username) => username.length > 3 && username.length < 8,
            transform: (username) => username.toUpperCase().trim()
        }
    }
})

function TodoItem(content, onClick) {
    return V.template({
        $: "template",
        $ctx: { content },
        li: {
            $: "li",
            $text: (ctx) => ctx.content,
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
        $each: (ctx, item) => {
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
