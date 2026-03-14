import { useState, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { AdminUser, UserCreate, UserUpdate } from '../types/admin.types'

export const useUsers = () => {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await api.get(API_ROUTES.ADMIN.USERS)
            setUsers(res.data)
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Erreur lors du chargement des utilisateurs')
        } finally {
            setLoading(false)
        }
    }, [])

    const createUser = useCallback(async (data: UserCreate) => {
        const res = await api.post(API_ROUTES.ADMIN.USERS, data)
        setUsers(prev => [...prev, res.data])
        return res.data
    }, [])

    const updateUser = useCallback(async (id: number, data: UserUpdate) => {
        const res = await api.put(`${API_ROUTES.ADMIN.USERS}/${id}`, data)
        setUsers(prev => prev.map(u => u.id === id ? res.data : u))
        return res.data
    }, [])

    const deleteUser = useCallback(async (id: number) => {
        await api.delete(`${API_ROUTES.ADMIN.USERS}/${id}`)
        setUsers(prev => prev.filter(u => u.id !== id))
    }, [])

    const resetUserPassword = useCallback(async (id: number) => {
        await api.post(`${API_ROUTES.ADMIN.USERS}/${id}/reset-password`)
    }, [])

    return {
        users, loading, error,
        fetchUsers, createUser, updateUser, deleteUser, resetUserPassword
    }
}
