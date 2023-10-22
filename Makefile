compile: clean
	tsc *.ts extensions/*.ts

clean:
	rm -f *.js extensions/*.js
