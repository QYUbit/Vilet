import V from "./vilet";

V.component({
    $state: {
        count: 0,
        showSecret: false,
        input: ""
    },
    $init: () => console.log("init"),
    $cleanup: () => console.log("cleanup"),
    counter: {
        $: "#counter",
        onClick: (state) => state.count++,
        text: (state) => `Count: ${state.count}`
    },
    toggle: {
        $: "#toggle",
        onClick: (state) => state.showSecret = !state.showSecret
    },
    secret: {
        $: "#secret",
        show: (state) => state.showSecret
    },
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
