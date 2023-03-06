import express from 'express'
import fs from 'fs'
import v8Profiler from 'v8-profiler-next'
import workerThreads from 'worker_threads'

const app = express()
let port = 3000

app.get('/cpuprofile', async (_, res) => {
  getcpuprofile()
  res.send('getcpuprofile success')
})
app.get('/heapprofile', async (_, res) => {
  getheapprofile()
  res.send('getheapprofile success')
})
app.get('/heapsnapshot', async (_, res) => {
  getheapsnapshot()
  res.send('getheapsnapshot success')
})

if(workerThreads.isMainThread) {
  app.listen(port, () => {       
    console.log( `server started at http://localhost:${port}`)
  })
}
else {
  getcpuprofile()
  getheapprofile()
  getheapsnapshot()
}

function getcpuprofile() {
  v8Profiler.setGenerateType(1)

  if (workerThreads.isMainThread) {
    const worker = new workerThreads.Worker(__filename, {
      env: process.env,
    })
    v8Profiler.startProfiling('main', true)
    worker.once('exit', code => {
      // create cpu profile in main thread
      const profile = v8Profiler.stopProfiling('main')
      const mainProfile = './main.cpuprofile'
      fs.existsSync(mainProfile) && fs.unlinkSync(mainProfile)
      if (profile) {
        fs.writeFileSync(mainProfile, JSON.stringify(profile))
      }
    })

    console.log('main_thread is working')
  } else {
    v8Profiler.startProfiling('worker_threads', true)
    // create cpu profile in worker_threads
    const start = Date.now()
    while (Date.now() - start < 2000) { }
    const profile = v8Profiler.stopProfiling('worker_threads')
    const workerProfile = './worker_threads.cpuprofile'
    fs.existsSync(workerProfile) && fs.unlinkSync(workerProfile)
    fs.writeFileSync(workerProfile, JSON.stringify(profile))

    console.log('worker_thread is working')
  }
}

function getheapprofile() {
  v8Profiler.setGenerateType(1)

  if (workerThreads.isMainThread) {
    const worker = new workerThreads.Worker(__filename, {
      env: process.env,
    })
    v8Profiler.startSamplingHeapProfiling()
  
    // create heap profile in main thread
    const profile = v8Profiler.stopSamplingHeapProfiling()
    const mainProfile = './main.heapprofile'
    fs.existsSync(mainProfile) && fs.unlinkSync(mainProfile)
    fs.writeFileSync(mainProfile, JSON.stringify(profile))
    
    console.log('main_thread is working') 
  } else {
    v8Profiler.startSamplingHeapProfiling()
    // create heap profile in worker_threads
    const start = Date.now()
    const array = []
    while (Date.now() - start < 2000) { array.push(new Array(1e3).fill('*')) }
    const profile = v8Profiler.stopSamplingHeapProfiling()
    const workerProfile = './worker_threads.heapprofile'
    fs.existsSync(workerProfile) && fs.unlinkSync(workerProfile)
    fs.writeFileSync(workerProfile, JSON.stringify(profile))

    console.log('worker_thread is working')
  }
}

function getheapsnapshot() {
  if (workerThreads.isMainThread) {
    const worker = new workerThreads.Worker(__filename, {
      env: process.env,
    })
    // create heapsnapshot in main thread
    createSnapshot('main.heapsnapshot')

    console.log('main_thread is working')
  } else {
    const start = Date.now()
    const array = []
    while (Date.now() - start < 2000) { array.push(new Array(1e3).fill('*')) }
    // create heapsnapshot in worker_threads
    createSnapshot('worker_threads.heapsnapshot')
    
    console.log('worker_thread is working')
  }
}

function createSnapshot(filename) {
  const snapshot = v8Profiler.takeSnapshot()
  const file = `./${filename}`
  const transform = snapshot.export()
  transform.pipe(fs.createWriteStream(file))
  transform.on('finish', snapshot.delete.bind(snapshot))
}
