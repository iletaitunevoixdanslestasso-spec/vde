import { supabase } from "../core/supabase/client";

export class BaseRepository {
    constructor(table) {
        this.table = table;
        this.supabase = supabase;
    }

    async findAll(orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select("*")
            .order(orderBy, { ascending: true });
    }
    async findAllNotDelete(orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select("*")
            .is("deleted_at", null)
            .order(orderBy, { ascending: true });
    }
    async findOneBy(criteria) {

        let query = this.supabase
            .from(this.table)
            .select("*");

        Object.entries(criteria).forEach(([field, value]) => {
            query = query.eq(field, value);
        });
        return query.single();
    }
    async findBy(criteria, orderBy = null) {

        let query = this.supabase
            .from(this.table)
            .select("*");

        Object.entries(criteria).forEach(([field, value]) => {
            query = query.eq(field, value);
        });

        if (orderBy) {
            query = query.order(orderBy, { ascending: true });
        }

        return query;
    }
    async insert(data) {

        const { data: sessionData } = await this.supabase.auth.getSession();

        console.log("SESSION SUPABASE", sessionData.session);
        return this.supabase.from(this.table).insert(data).select("*").single();
    }

    async update(id, data) {
        return this.supabase.from(this.table).update(data).eq("id", id).select("*").single(); // ⭐ IMPORTANT;
    }


    async findById(id) {
        return this.supabase.from(this.table).select("*").eq("id", id).single();
    }

    async delete(id) {
        console.log("par ici")
        return await this.softDelete(id)
        // return this.supabase.from(this.table).delete().eq("id", id);
    }

    async softDelete(id) {
        return this.supabase
            .from(this.table)
            .update({
                deleted_at: new Date().toISOString()
            })
            .eq("id", id)
            .select("*")
            .single();
    }
    async updateByCriteria(criteria, data) {

        let query = this.supabase
            .from(this.table)
            .update(data);

        Object.entries(criteria).forEach(([field, value]) => {
            query = query.eq(field, value);
        });

        return query
            .select("*")
            .single();
    }
}