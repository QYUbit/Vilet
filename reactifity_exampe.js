import { computed, effect, reactive, watch } from "./reactivity"

const data = reactive({
    count: 0,
    name: 'Alice',
    items: ['a', 'b', 'c']
})

effect(() => {
    console.log(`New count: ${data.count}`)
})

const doubled = computed(() => data.count * 2)

watch(() => data.name, (newName, oldName) => {
    console.log(`Name changed from ${oldName} to ${newName}`)
})

data.count++
data.name = 'Bob'

console.log(doubled.value)