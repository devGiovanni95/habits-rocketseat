import { prisma } from "./lib/prisma"
import { FastifyInstance } from "fastify"
import {z} from 'zod'
import dayjs from "dayjs"

export async function appRoutes(app: FastifyInstance){

    app.post('/habits',async (request)=>{
        //title, weekDays

        //utilizando para validar os tipos de informações
        const createHabitBody = z.object({
            title: z.string(),
            weekDays: z.array(
                z.number().min(0).max(6)
            )
        })

        const {title, weekDays} = createHabitBody.parse(request.body)
    
        //formatar a data para nao mostrar o horario => 00:00:00
        const today = dayjs().startOf('day').toDate()

        await prisma.habit.create({
            data:{
                title,
                created_at:today,
                weekDays:{
                    create: weekDays.map(weekDay => {
                        return{
                            week_day: weekDay
                        }
                    })
                }
            }
        })
    })
    
    app.get('/day', async (request) => {
        const getDayParams = z.object({
            date: z.coerce.date()  //convertendo a string recebida em data
        })

        const {date} = getDayParams.parse(request.query)

        //pegando o dia da semana
        const parsedDate = dayjs(date).startOf('day')
        const weekDay = parsedDate.get('day')

        // todos os habitos possiveis 
        // habitos que ja foram completados

        const possibleHabits = await prisma.habit.findMany({
            where: {
                created_at:{
                    lte: date,
                },
                weekDays:{
                    some: {
                        week_day: weekDay
                    }
                }
            }
        })

        const day = await prisma.day.findUnique({
            where: {
                date: parsedDate.toDate(),
            },
            include: {
                dayHabits: true,
            }
        })

        const completedHabits = day?.dayHabits.map(dayHabit => {
            return dayHabit.habit_id
        })

        return{
            possibleHabits, 
            completedHabits
        }
    })
}

